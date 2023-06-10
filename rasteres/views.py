from django.shortcuts import render
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
import os
from datetime import datetime
import os
import rasterio
from django.http import JsonResponse
import numpy as np
from rasterio.features import geometry_mask
from rasterio.mask import mask
from shapely.geometry import Polygon
import json
import glob
import numpy as np


import json
from shapely.geometry import box, mapping
from shapely.geometry import shape

from shapely.geometry import shape
import json
import tempfile

from rasterio.transform import Affine




class GeoTIFFClip(APIView):
    def post(self, request, format=None):
        polygon = request.data.get('polygon')
        geotiff_path = request.data.get('geotiff')
        # Get the path to the GeoTIFF file
        geotiff_path = "static/lst/"+geotiff_path
        with rasterio.open(geotiff_path) as src:
            # Retrieve the geometry coordinates
            raster_data = src.read(1)
            metadata = src.meta
            print(metadata)
            raster_data = np.where(raster_data == -9999, np.nan, raster_data)
            # Calculate the mean value
            max_value = np.nanmin(raster_data)
            min_value = np.nanmax(raster_data)
        # Serve the GeoTIFF file using FileResponse
        return Response({"max_value": max_value, "min_value": min_value})


class GeoTIFFMINMAX(APIView):
    def post(self, request, format=None):
        geotiff_path = request.data.get('geotiff')

        # Get the path to the GeoTIFF file
        geotiff_path = "static/lst/"+geotiff_path
        with rasterio.open(geotiff_path) as src:
            # Retrieve the geometry coordinates
            raster_data = src.read(1)
            metadata = src.meta
            print(metadata)
            raster_data = np.where(raster_data == -9999, np.nan, raster_data)
            # Calculate the mean value
            max_value = np.nanmin(raster_data)
            min_value = np.nanmax(raster_data)
        # Serve the GeoTIFF file using FileResponse
        return Response({"max_value": max_value, "min_value": min_value})


class FindAll(APIView):
    def get(self, request, format=None):
        directory = 'lst'  # Directory name within static directory
        static_path = os.path.join('static', directory)
        data = []
        # Retrieve all GeoTIFF files in the directory
        geotiff_files = []
        for filename in os.listdir(static_path):
            file_path = os.path.join(static_path, filename)
            if os.path.isfile(file_path) and filename.lower().endswith('.tif'):
                date_string = filename.split("_")[-3]
                date = datetime.strptime(date_string, "%Y%m%d").date()
                data.append({"path": filename, "date": date, })
        return Response({"data": data, })
        # Serve the GeoTIFF file using FileResponse
from collections import defaultdict


class SelectValueOfPixel(APIView):
    def post(self, request):
        # Get the latitude and longitude from the request data
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        lat = float(lat)
        lng = float(lng)
        product = request.data.get('product')
        hours=request.data.get("hours")
        hours = hours.split(",") if hours else []  # Split hours string into a list
        start_date = datetime.strptime(
            request.data.get('start_date'), "%Y-%m-%d").date()
        end_date = datetime.strptime(
            request.data.get('end_date'), "%Y-%m-%d").date()
        
        
        # Replace with the actual folder path
        folder_path = 'static/' + str(product) + "/"
        tif_files = glob.glob(folder_path + '/*.tif')
        selected_files = []
        selected_dates = []
        
        # if sm product is selected
        if product == "lst":
            for file_path in tif_files:
                date_string = file_path.split("_")[-3]
                file_date = datetime.strptime(date_string, "%Y%m%d").date()
                parts = file_path.split("_")
                # Extract the hour from the second-to-last part
                hour_part = parts[-2]
                # Extract the hour value
                hour = int(hour_part[:2])
                if start_date <= file_date <= end_date and  str(hour) in hours:
                    selected_files.append(file_path)
                    selected_dates.append(file_date)
        
        # if sm is selected           
        else:
            for file_path in tif_files:
                date_string = file_path.split("_")[-3]
                file_date = datetime.strptime(date_string, "%Y%m%d").date()
                parts = file_path.split("_")
                if start_date <= file_date <= end_date:
                    selected_files.append(file_path)
                    selected_dates.append(file_date)
        if selected_files:
            date_values = defaultdict(list)
            values = []
            for selected_file in selected_files:
                date_string = selected_file.split("_")[-3]
                file_date = datetime.strptime(date_string, "%Y%m%d").date()
                with rasterio.open(selected_file) as dataset:
                    # Open the GeoTIFF file using Rasterio
                    row, col = dataset.index(lng, lat)
                    pixel_value = dataset.read(1, window=((row, row+1), (col, col+1)))
                    value = pixel_value.mean()
                    values.append(value)
                    date_values[file_date].append(value)

            sorted_dates = sorted(date_values.keys())
            selected_dates = []
            averaged_values = []
            for date in sorted_dates:
                values_list = date_values[date]
                filtered_values = [v for v in values_list if v != -9999]
                if filtered_values:
                    selected_dates.append(date)
                    averaged_value = sum(filtered_values) / len(filtered_values)
                    averaged_values.append(averaged_value)

            result = []
            for i in range(len(selected_dates)):
                result.append({
                    "date": selected_dates[i],
                    "value": averaged_values[i]
                })
            result = list(zip([item["value"] for item in result], [item["date"] for item in result]))
            
            response = {
                "data": result,
                'lat': lat,
                'lng': lng
            }
            print(len(averaged_values), len(selected_dates), averaged_values)


        else:
            response = {
                "error": "404"
                
            }

        return Response(response)


class SelectValueOfPolygon(APIView):
    def post(self, request):
        polygon = request.data.get('polygon')
        product = request.data.get('product')
        hours=request.data.get("hours")
        hours = hours.split(",") if hours else []  # Split hours string into a list
        start_date = datetime.strptime(
            request.data.get('start_date'), "%Y-%m-%d").date()
        end_date = datetime.strptime(
            request.data.get('end_date'), "%Y-%m-%d").date()
        polygon = json.loads(polygon)
        coordinates = [[point['lng'], point['lat']] for point in polygon]
        polygon = Polygon(coordinates)
        geometry = shape(polygon)
        
        # Replace with the actual folder path
        folder_path = 'static/' + str(product) + "/"
        tif_files = glob.glob(folder_path + '/*.tif')
        selected_files = []
        selected_dates = []
        
        # if sm product is selected
        if product == "lst":
            for file_path in tif_files:
                date_string = file_path.split("_")[-3]
                file_date = datetime.strptime(date_string, "%Y%m%d").date()
                parts = file_path.split("_")
                # Extract the hour from the second-to-last part
                hour_part = parts[-2]
                # Extract the hour value
                hour = int(hour_part[:2])
                if start_date <= file_date <= end_date and  str(hour) in hours:
                    selected_files.append(file_path)
                    selected_dates.append(file_date)
        # if sm is selected           
        else:
            for file_path in tif_files:
                date_string = file_path.split("_")[-3]
                file_date = datetime.strptime(date_string, "%Y%m%d").date()
                parts = file_path.split("_")
                if start_date <= file_date <= end_date:
                    selected_files.append(file_path)
                    selected_dates.append(file_date)
        if selected_files:
            means = []
            for selected_file in selected_files:
                with rasterio.open(selected_file) as dataset:
                    dataset_bounds = box(*dataset.bounds)
                    image = dataset.read(1)
                    mask2 = geometry_mask(
                        [geometry], out_shape=image.shape, transform=dataset.transform, invert=True)
                    # Apply the mask to clip the image
                    out_image = image * mask2
                    out_image, out_transform = mask(
                        dataset, [geometry], crop=True)
                    out_image_ = out_image[0]
                    out_image_ = np.where(out_image == -9999, np.nan, out_image)
                    mean_value = np.nanmean(out_image_)
                    means.append(mean_value)
            
            # Retrieve the transformed bounds of the clipped part
            clipped_geometry = geometry.intersection(dataset_bounds)
            clipped_transform = Affine(out_transform.a, out_transform.b, clipped_geometry.bounds[0],
                                       out_transform.d, out_transform.e, clipped_geometry.bounds[3])
            with rasterio.open("static/tmp/clipped.tif", "w", driver='GTiff', height=out_image.shape[1],
                               width=out_image.shape[2], count=1, dtype=out_image.dtype,
                               crs=dataset.crs, transform=clipped_transform) as clipped_dataset:
                clipped_dataset.write(out_image[0], 1)
            clipped_tiff_path = "static/tmp/clipped.tif"  # Path of the saved GeoTIFF
                
            result = list(zip(means, selected_dates))
            mean_dict = {}
            for mean, date in result:
                if date in mean_dict:
                    mean_dict[date].append(mean)
                else:
                    mean_dict[date] = [mean]

            result = [(str(np.nanmean(means)), date) for date, means in mean_dict.items()]
            result.sort(key=lambda x: x[1])  # Sort by the second element (date)
            mean_of_means = np.nanmean(means)
            min_ = np.nanmin(means)
            max_ = np.nanmax(means)
                        
            result = [(str(mean), date) for mean, date in result]
            mean_of_means = str(mean_of_means)
            

            response = {
                "path":clipped_tiff_path,
                "data": result,
                "mean": mean_of_means,
                "min": min_,
                "max": max_,      
            }

        else:
            response = {
                "error": "No Data"
            }

        return Response(response)



def map_view(request):
    hours = range(24)  # Generate a range of hours (0 to 23)
    context = {'hours': hours}
    return render(request, 'map.html', context)

